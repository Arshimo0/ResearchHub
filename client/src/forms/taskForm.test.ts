import { describe, expect, it } from 'vitest'
import type { ResearchTask } from '../api/types'
import { emptyTaskValues, taskToFormValues, toTaskDetails } from './taskForm'

const task: ResearchTask = {
  id: 't1',
  projectId: 'p1',
  paperId: null,
  title: 'Read the paper',
  description: 'Summarise section 3',
  status: 'ToDo',
  priority: 'High',
  deadline: '2999-12-31T00:00:00',
  assignedToUserId: null,
  assignedToName: null,
  createdByUserId: 'u1',
  createdByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  completedAt: null,
}

describe('taskToFormValues', () => {
  it('fills the form from a task, keeping the deadline date as written', () => {
    expect(taskToFormValues(task)).toEqual({
      title: 'Read the paper',
      description: 'Summarise section 3',
      priority: 'High',
      deadline: '2999-12-31',
    })
  })

  it('shows a missing deadline as an empty field', () => {
    expect(taskToFormValues({ ...task, deadline: null }).deadline).toBe('')
  })
})

describe('toTaskDetails', () => {
  it('trims text and turns an empty deadline into null', () => {
    expect(toTaskDetails({ ...emptyTaskValues, title: '  A task  ', description: ' notes ' })).toEqual({
      title: 'A task',
      description: 'notes',
      priority: 'Medium',
      deadline: null,
    })
  })

  it('round-trips a task unchanged, which is how the dialogs notice "nothing changed"', () => {
    expect(toTaskDetails(taskToFormValues(task))).toEqual(toTaskDetails(taskToFormValues(task)))
    expect(toTaskDetails(taskToFormValues(task)).deadline).toBe('2999-12-31')
  })
})