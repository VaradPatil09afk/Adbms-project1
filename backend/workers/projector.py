"""Idempotent central projection worker for Debezium CDC events.

This worker is intentionally independent from the request API: campus writes never
wait for MongoDB or Neo4j, preserving the eventual-consistency boundary.
"""
import json
import os
from kafka import KafkaConsumer
from pymongo import MongoClient
from neo4j import GraphDatabase

MONGO = MongoClient(os.getenv('MONGO_URI', 'mongodb://mongodb:27017'))['unisphere']
GRAPH = GraphDatabase.driver(os.getenv('NEO4J_URI', 'bolt://neo4j:7687'), auth=('neo4j', os.getenv('NEO4J_PASSWORD', 'neo4j-demo-password')))

def unwrap(value):
    payload = value.get('payload', value)
    return payload.get('after'), payload.get('op')

def project(topic, value):
    after, operation = unwrap(value)
    entity = topic.rsplit('.', 1)[-1]
    if operation == 'd' or not after:
        return
    entity_id = str(after.get('id'))
    # Mongo is the flexible, denormalized/search projection.
    MONGO[entity].replace_one({'_id': entity_id}, {'_id': entity_id, **after, '_source_topic': topic}, upsert=True)
    with GRAPH.session() as session:
        if entity == 'students':
            session.run('MERGE (s:Student {id:$id}) SET s += $props', id=entity_id, props=after)
        elif entity == 'courses':
            session.run('MERGE (c:Course {id:$id}) SET c += $props', id=entity_id, props=after)
        elif entity == 'enrollments':
            session.run('MATCH (s:Student {id:$student}) MATCH (c:Course {id:$course}) MERGE (s)-[r:ENROLLED_IN {semester:$semester}]->(c) SET r.grade=$grade, r.score=$score', student=str(after['student_id']), course=str(after['course_id']), semester=after.get('semester'), grade=after.get('grade'), score=after.get('score'))

def main():
    consumer = KafkaConsumer(bootstrap_servers=os.getenv('KAFKA_BOOTSTRAP', 'kafka:9092'), group_id='unisphere-central-projector', auto_offset_reset='earliest', value_deserializer=lambda v: json.loads(v.decode('utf-8')))
    consumer.subscribe(pattern=r'unisphere\.(pune|mumbai|bengaluru)\..*')
    for message in consumer:
        try:
            project(message.topic, message.value)
        except Exception as exc:
            # Keep the stream alive; production wiring would send this to a DLQ.
            print(f'projection error on {message.topic}: {exc}', flush=True)

if __name__ == '__main__': main()
