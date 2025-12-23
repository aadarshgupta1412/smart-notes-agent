# API Testing Guide

Complete cURL commands for testing all endpoints.

## Prerequisites

```bash
# Start the server
uvicorn app.main:app --reload

# Server should be running on http://localhost:8000
```

---

## 1. Health Check

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "Smart Notes Agent"
}
```

---

## 2. Create Note

```bash
curl -X POST http://localhost:8000/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting Notes",
    "content": "Discussed Q4 roadmap and priorities"
  }'
```

**Expected Response:**
```json
{
  "title": "Meeting Notes",
  "content": "Discussed Q4 roadmap and priorities",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-23T08:00:00.000000"
}
```

---

## 3. List All Notes

```bash
curl http://localhost:8000/notes
```

**Expected Response:**
```json
[
  {
    "title": "Meeting Notes",
    "content": "Discussed Q4 roadmap and priorities",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-23T08:00:00.000000"
  }
]
```

---

## 4. Get Specific Note

```bash
# Replace {note_id} with actual ID from previous response
curl http://localhost:8000/notes/{note_id}
```

**Expected Response:**
```json
{
  "title": "Meeting Notes",
  "content": "Discussed Q4 roadmap and priorities",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-23T08:00:00.000000"
}
```

---

## 5. Update Note

```bash
# Replace {note_id} with actual ID
curl -X PUT http://localhost:8000/notes/{note_id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Meeting Notes",
    "content": "Discussed Q4 roadmap, priorities, and budget"
  }'
```

**Expected Response:**
```json
{
  "title": "Updated Meeting Notes",
  "content": "Discussed Q4 roadmap, priorities, and budget",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-23T08:00:00.000000"
}
```

---

## 6. Delete Note

```bash
# Replace {note_id} with actual ID
curl -X DELETE http://localhost:8000/notes/{note_id}
```

**Expected Response:** 204 No Content (empty response)

---

## 7. Agent - List Notes

```bash
curl -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "list my notes"}'
```

**Expected Response:**
```json
{
  "tools_used": ["list_notes_tool"],
  "answer": "Here are all your notes:\n\n• Meeting Notes\n  Discussed Q4 roadmap..."
}
```

---

## 8. Agent - Summarize Notes

```bash
curl -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "summarize my notes"}'
```

**Expected Response:**
```json
{
  "tools_used": ["list_notes_tool", "summarize_tool"],
  "answer": "Summary of your notes:\n\nThe notes discuss Q4 roadmap and priorities..."
}
```

---

## 9. Agent - List AND Summarize

```bash
curl -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "list and summarize my notes"}'
```

**Expected Response:**
```json
{
  "tools_used": ["list_notes_tool", "summarize_tool"],
  "answer": "Summary of your notes:\n\n...\n\n---\n\nList of all your notes:\n\n..."
}
```

---

## 10. Agent - Streaming Response

```bash
curl -N -X POST http://localhost:8000/agent/ask/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "summarize my notes"}'
```

**Expected Response** (newline-delimited JSON):
```json
{"type": "thought", "content": "Reading your question..."}
{"type": "thought", "content": "Detected request to summarize notes."}
{"type": "tool", "content": "Calling list_notes_tool..."}
{"type": "tool", "content": "Sending data to Gemini for summarization..."}
{"type": "final", "content": "Summary of your notes: ..."}
```

---

## Complete Test Script

Save as `test_all.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"

echo "1. Health Check"
curl -s $BASE_URL/health | jq

echo -e "\n2. Create Note"
NOTE_ID=$(curl -s -X POST $BASE_URL/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note","content":"Test content"}' | jq -r '.id')
echo "Created note: $NOTE_ID"

echo -e "\n3. List Notes"
curl -s $BASE_URL/notes | jq

echo -e "\n4. Get Note"
curl -s $BASE_URL/notes/$NOTE_ID | jq

echo -e "\n5. Update Note"
curl -s -X PUT $BASE_URL/notes/$NOTE_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","content":"Updated content"}' | jq

echo -e "\n6. Agent - List"
curl -s -X POST $BASE_URL/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query":"list my notes"}' | jq

echo -e "\n7. Agent - Summarize"
curl -s -X POST $BASE_URL/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query":"summarize my notes"}' | jq

echo -e "\n8. Agent - Stream"
curl -N -X POST $BASE_URL/agent/ask/stream \
  -H "Content-Type: application/json" \
  -d '{"query":"summarize my notes"}'

echo -e "\n9. Delete Note"
curl -s -X DELETE $BASE_URL/notes/$NOTE_ID

echo -e "\n✅ All tests complete!"
```

**Run it:**
```bash
chmod +x test_all.sh
./test_all.sh
```

---

## Error Cases

### 404 - Note Not Found
```bash
curl http://localhost:8000/notes/invalid-id
```

**Response:**
```json
{
  "detail": "Note with id invalid-id not found"
}
```

### 422 - Validation Error
```bash
curl -X POST http://localhost:8000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Missing content field"}'
```

**Response:**
```json
{
  "detail": [
    {
      "loc": ["body", "content"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Interactive API Docs

FastAPI provides interactive documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

You can test all endpoints directly from the browser!
