# Phase 9: Real HTTP Execution Engine Verification

The following tests were executed to ensure the real HTTP engine behaves flawlessly, safely executing requests, mapping responses, and handling errors.

### 1. Real HTTP GET Test
- **URL**: `https://jsonplaceholder.typicode.com/posts/1`
- **Method**: `GET`
- **Verification**: The worker accurately fetched the external JSON data. The execution details modal displays the `200 OK` status badge, along with the parsed JSON body and request duration.

### 2. Real HTTP POST Test
- **URL**: `https://jsonplaceholder.typicode.com/posts`
- **Method**: `POST`
- **Payload**: `{"title": "foo", "body": "bar", "userId": 1}`
- **Verification**: The worker constructed the POST body and correctly injected `Content-Type: application/json`. It received a `201 Created` status with the resulting mock object.

### 3. Invalid Domain Test
- **URL**: `https://invalid-domain-stargate-test.com`
- **Method**: `GET`
- **Verification**: The fetch call successfully threw a `Network error: fetch failed` due to `ENOTFOUND`. The error was safely caught and persisted as `error: Network error: fetch failed` on the `NodeExecution`. The worker process remains completely healthy.

### 4. Timeout Test
- **URL**: `https://httpbin.org/delay/2`
- **Method**: `GET`
- **Timeout Configuration**: `1000`ms
- **Verification**: The Node.js native `AbortController` gracefully terminated the connection after 1000ms. The `NodeExecution` recorded a `Request timed out after 1000ms` failure.

## Database Verification
```text
 status  |                                                                                                                                                 output_trunc                                                                                                                                                 
---------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 FAILED  | 
 SUCCESS | {"url": "https://jsonplaceholder.typicode.com/posts", "body": {"id": 101, "body": "bar", "title": "foo", "userId": 1}, "method": "POST", "status": 201, "headers": {"nel": "{\"report_to\":\"heroku-nel\",\"response_headers\":[\"Via\"],\"max_age\":3600,\"success_fraction\":0.01,\"failure_fraction\":0.1
 SUCCESS | {"url": "https://jsonplaceholder.typicode.com/posts/1", "body": {"id": 1, "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto", "title": "sunt aut facere repellat provident occaecat
 FAILED  | 
(4 rows)

 status  |            error            
---------+-----------------------------
 FAILED  | Network error: fetch failed
 SUCCESS | 
 SUCCESS | 
 FAILED  | Request timed out after 1000ms
(4 rows)
```

## UI Components
**Config Modal**
![Config Modal](/Users/ayush/Desktop/stargate/docs/screenshots/phase9-config-modal.png)

**Execution Details**
![Execution Details](/Users/ayush/Desktop/stargate/docs/screenshots/phase9-exec-details.png)
