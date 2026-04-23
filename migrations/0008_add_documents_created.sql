-- Lifetime count of documents created (every upload, even ones never shared)
INSERT INTO stats (key, value) SELECT 'documents_created', COUNT(*) FROM documents;
