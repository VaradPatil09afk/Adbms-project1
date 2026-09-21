# Neo4j projection

The central projection represents `(Student)-[:ENROLLED_IN]->(Course)`, `(Course)-[:REQUIRES]->(Course)`, and `(Faculty)-[:TEACHES]->(Course)`. A CDC consumer should use `MERGE` for each event so projection writes are idempotent.

Example traversal used by the API:

```cypher
MATCH (c:Course {code: $code})-[:REQUIRES*]->(required:Course)
RETURN DISTINCT required.code, required.title
```
