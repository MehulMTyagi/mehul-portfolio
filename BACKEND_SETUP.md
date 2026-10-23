# Visitor Card Backend

The visitor-card backend is a Vercel Serverless Function at:

```text
/api/visitor-cards
```

It uses Vercel Blob to persist the shared gallery in:

```text
visitor-cards/cards.json
```

## Required Vercel Setup

1. Open the Vercel project for this portfolio.
2. Go to Storage.
3. Create or connect a Vercel Blob store.
4. Make sure Vercel adds `BLOB_READ_WRITE_TOKEN` to the project environment variables.
5. Redeploy the project.

Without `BLOB_READ_WRITE_TOKEN`, the frontend falls back to browser localStorage so the portfolio still works locally.

New cards receive a server-generated ID and a private edit token stored in the creator's browser. Creating a card never updates an existing record. Editing or deleting requires that token. Cards saved before this ownership change remain visible but cannot be safely claimed for editing; their creators should make a new card.
