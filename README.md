# Multilanguage Documentation Build & Deployment Process

This project automates the generation, building, and deployment of multilingual documentation (EN/IT) using MkDocs, custom Python scripts, and GitHub Actions. Below is a step-by-step overview of the workflow, starting from pre-configuration scripts to the full automation pipeline.

## 1. PreConfiguration Scripts

Located in `preConfiguration/`, these Python scripts and templates prepare the environment and configuration files needed for building and exporting documentation:

 
 - **build_config.py**: Generates MkDocs configuration files for each language (EN/IT) based on navigation templates and project structure.
 - **pdf_config.py**: Prepares custom HTML templates for PDF generation (header, footer, first page) and places them in `documentation/pdfGeneration`.
 - **figureEnumerator.py**: Renumbers figure captions in the generated HTML documentation for consistency.
 - **image_resizier.py**: Optimizes images for web and PDF output.
 - **nav_config_it.yml / nav_config_en.yml**: Navigation configuration templates for Italian and English documentation.
 - **requirements.txt**: Lists Python dependencies required for the build scripts.

## 2. GitHub Actions Workflow (`.github/workflows/Automation.yml`)

The main automation pipeline is defined in `Automation.yml` and orchestrates the following steps:

### a. Setup & Versioning

- Checks out the repository and sets up Python.
- Installs dependencies from `requirements.txt`.
- Configures Git user for commits.
- Fetches all history and the `gh-pages` branch.
- Determines the next documentation version based on the current date and previous releases.

### b. Configuration Generation

- Runs `build_config.py` to generate MkDocs configs for EN/IT.
- Runs `pdf_config.py` to prepare PDF templates.

### c. Documentation Build & PDF Generation

- Builds documentation for IT and EN using MkDocs.
- Renumbers figure captions in the generated HTML.
- Installs `wkhtmltopdf` for PDF export.
- Generates PDFs for both languages, outputting to `generated/pdf/`.

### d. Swagger API Integration

- Authenticates and fetches Swagger specs for multiple APIs.
- Saves each API's JSON spec in `includes/swagger/`.
- For each API, creates a Markdown file in `docs/en/swagger` and `docs/it/swagger` with the format `!!swagger **nomeapi**.json!!` for MkDocs integration.
- Copies all Swagger artifacts into the respective language documentation folders before build.

### e. Navigation Config Switching

- Temporarily switches navigation configs to use `/index.html` links for proper print-site plugin operation.
- Rebuilds documentation with updated nav configs.
- Restores original nav configs after build.

### f. PDF File Placement

- Copies generated PDFs from `generated/pdf/` to both `generated/en/` and `generated/it/` folders for deployment and access.

### g. Image Optimization

- Runs `image_resizier.py` to optimize images.

### h. Deployment

- Clones the `gh-pages` branch into a temporary directory.
- Copies all files from `generated/` into a new versioned directory.
- Updates the `latest` symlink to point to the new version.
- Commits and pushes changes to `gh-pages`.

## 3. Output Structure

- **generated/pdf/**: Central location for all generated PDFs.
- **generated/en/**, **generated/it/**: Language-specific output folders containing HTML, PDFs, and assets.
- **docs/en/swagger/**, **docs/it/swagger/**: Contains Swagger JSON specs and Markdown references for API documentation.
- **documentation/pdfGeneration/**: Contains custom HTML templates for PDF export.

## 4. Key Features

- Fully automated multilingual documentation build and deployment.
- Dynamic navigation config switching for print-site plugin compatibility.
- Centralized and language-specific PDF placement for easy access.
- Automated Swagger API documentation integration.
- Image optimization for web and PDF outputs.

## 5. How to Run Locally

1. Install Python and required dependencies:

   ```sh
   pip install -r preConfiguration/requirements.txt
   ```

2. Run pre-configuration scripts as needed:

   ```sh
   python preConfiguration/build/build_config.py
   python preConfiguration/pdf/pdf_config.py
   python preConfiguration/build/image_resizier.py
   ```

3. Build documentation:

   ```sh
   mkdocs build -f config/en/mkdocs.yml
   mkdocs build -f config/it/mkdocs.yml
   ```

4. Generate PDFs (requires wkhtmltopdf):

   ```sh
   wkhtmltopdf ... # see workflow for full command
   ```

5. Deploy manually by copying files to your web server or using the deployment steps in the workflow.

## Markdown Examples from Administration.md

Below are examples of all the different Markdown elements used in the Administration documentation:


### 1. Headings
# Main Title
## Section Title
### Subsection Title


### 2. Bullet Lists
- First item
- Second item
- Third item


### 3. Numbered Lists
1. First step
2. Second step
3. Third step


### 4. Images
![Alt text](assets/images/extract/media/image42.png)


### 5. Bold Text
**Bold text**


### 6. Italic Text
*Italic text*


### 7. Inline Code
`inline code`


### 8. Blockquotes
> This is a blockquote


### 9. Horizontal Rule
---


### 10. Nested Lists
- Main item
   - Subitem
      - Subsubitem


### 11. Mixed Formatting in Lists
- **Bold item**: Description
- *Italic item*: Description


### 12. Links
[Link text](https://example.com)

---
Use these examples to structure your documentation for clarity and consistency.