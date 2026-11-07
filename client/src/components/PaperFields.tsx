import type { PaperFormValues } from '../forms/paperForm'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

interface PaperFieldsProps {
  values: PaperFormValues
  onChange: (patch: Partial<PaperFormValues>) => void
  errors: Record<string, string>
}

export function PaperFields({ values, onChange, errors }: PaperFieldsProps) {
  return (
    <>
      <TextField
        label="Title"
        name="title"
        autoComplete="off"
        value={values.title}
        onChange={(e) => onChange({ title: e.target.value })}
        error={errors.title}
      />
      <TextField
        label="Authors"
        name="authors"
        autoComplete="off"
        hint="Separate names with semicolons."
        value={values.authors}
        onChange={(e) => onChange({ authors: e.target.value })}
        error={errors.authors}
      />
      <TextAreaField
        label="Abstract"
        name="abstract"
        rows={5}
        value={values.abstract}
        onChange={(e) => onChange({ abstract: e.target.value })}
        error={errors.abstract}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Publication date"
          type="date"
          name="publicationDate"
          value={values.publicationDate}
          onChange={(e) => onChange({ publicationDate: e.target.value })}
          error={errors.publicationDate}
        />
        <TextField
          label="DOI or URL"
          name="doiOrUrl"
          autoComplete="off"
          hint="A DOI like 10.1000/xyz, or a web address."
          value={values.doiOrUrl}
          onChange={(e) => onChange({ doiOrUrl: e.target.value })}
          error={errors.doiOrUrl}
        />
      </div>

      <TextField
        label="PDF link"
        name="pdfReference"
        autoComplete="off"
        hint="Optional. Where the PDF can be found."
        value={values.pdfReference}
        onChange={(e) => onChange({ pdfReference: e.target.value })}
        error={errors.pdfReference}
      />
    </>
  )
}