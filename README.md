# Pagefold — PDF to Markdown Converter

A privacy-focused, browser-based application that converts PDF documents into structured Markdown files. Pagefold extracts selectable text from PDF documents and transforms it into a lightweight format suitable for reading, editing, searching, and AI-assisted workflows.

## Features

- **PDF Upload:** Select documents using the file browser or drag-and-drop interface.
- **Text Extraction:** Extract selectable text from PDF pages using PDF.js.
- **Markdown Conversion:** Convert extracted content into Markdown with page-level organization.
- **Local Processing:** Process documents directly in the browser without uploading them to a backend server.
- **Download:** Export converted documents as `.md` files.
- **Clipboard Support:** Copy converted Markdown directly to the clipboard.
- **Progress Tracking:** Monitor document processing progress.
- **File Validation:** Enforce PDF format and a maximum file size of 100 MB.

## Technology Stack

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Mozilla PDF.js
- Markdown

## How It Works

1. The user selects or drops a PDF document into the application.
2. The application validates the selected file.
3. PDF.js reads the document locally in the browser.
4. Text is extracted page by page.
5. Extracted content is organized into Markdown sections.
6. The user can download or copy the resulting Markdown file.

## Privacy and Data Handling

Pagefold uses client-side PDF processing. Documents are read in the browser and are not uploaded to an application backend.

## Current Limitations

- Scanned PDFs requiring optical character recognition (OCR) are not supported.
- Complex tables, multi-column layouts, images, and advanced formatting may not be reconstructed accurately.
- The estimated token count is approximate and is calculated from extracted text length.

## Project Structure

```text
pagefold/
├── index.html
├── styles.css
├── app.js
├── brand-mark.svg
├── manus-routes.json
└── vendor/
    ├── pdf.min.js
    ├── pdf.worker.min.js
    └── LICENSE.pdfjs
```

## Getting Started

No build tools or backend services are required.

1. Clone or download this repository.
2. Open `index.html` in a modern web browser.
3. Select a PDF document and convert it to Markdown.

For local HTTP testing, you can also run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Future Improvements

- OCR support for scanned documents.
- Improved reading-order reconstruction.
- Better table and multi-column extraction.
- Automated extraction-quality evaluation.
- Support for additional document formats.

## License

The PDF.js distribution included in this repository contains its Apache License 2.0 notice. Choose and document a license for the original Pagefold application separately, subject to the terms governing your original code and development tools.
