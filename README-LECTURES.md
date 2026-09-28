# Lecture system - how to add content

Everything is driven by `batches.json` (static, no backend).

Flow: `index.html` -> `batch.html?id=BATCH_ID` -> `batch.html?id=BATCH_ID&subject=SUBJECT_ID` -> `content.html?id=LECTURE_ID`

```json
{
  "new": [
    {
      "id": "batch-1",
      "title": "Batch Name",
      "thumbnail": "images/your-thumbnail.jpg",
      "subjects": [
        {
          "id": "physics",
          "name": "Physics",
          "lectures": [
            { "id": "physics-lecture-1", "title": "Lecture 1", "teacher": "Teacher Name", "video": "https://.../file.mp4" }
          ]
        }
      ]
    }
  ],
  "old": []
}
```

Rules
- `id` values must be unique. Lecture ids must be unique across ALL batches (they are used directly in `content.html?id=...`).
- `video` accepts direct `.mp4` / `.webm` URLs and `.m3u8` (HLS; hls.js is loaded only when needed). Leave it `""` to show "Video unavailable".
- `teacher` is optional. Batch `title` and `thumbnail` are used by the existing home page.
- The batch "Sample Batch" shipped here is a placeholder - replace it with your real batches.
- Validate after editing: paste the file into any JSON validator.
