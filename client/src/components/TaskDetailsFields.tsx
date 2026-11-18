import type { TaskPriority } from '../api/types'
import type { TaskFormValues } from '../forms/taskForm'
import { SelectField } from './SelectField'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

interface TaskDetailsFieldsProps {
  values: TaskFormValues
  onChange: (patch: Partial<TaskFormValues>) => void
  errors: Record<string, string>
}

export function TaskDetailsFields({ values, onChange, errors }: TaskDetailsFieldsProps) {
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
      <TextAreaField
        label="Description"
        name="description"
        rows={4}
        value={values.description}
        onChange={(e) => onChange({ description: e.target.value })}
        error={errors.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Priority"
          name="priority"
          value={values.priority}
          onChange={(e) => onChange({ priority: e.target.value as TaskPriority })}
          error={errors.priority}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </SelectField>

        <TextField
          label="Deadline"
          type="date"
          name="deadline"
          hint="Optional."
          value={values.deadline}
          onChange={(e) => onChange({ deadline: e.target.value })}
          error={errors.deadline}
        />
      </div>
    </>
  )
}