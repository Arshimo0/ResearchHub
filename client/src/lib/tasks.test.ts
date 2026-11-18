import { describe, expect, it } from 'vitest'
import type { ResearchTask } from '../api/types'
import { canChangeStatus, canManageTask, groupByStatus, isOverdue } from './tasks'

// Months in `new Date(...)` count from 0, so 9 means October. These are local dates.
const oct21Noon = new Date(2026, 9, 21, 12, 0)
const oct21LateNight = new Date(2026, 9, 21, 23, 59)

describe('isOverdue', () => {
  it('is not overdue before or on the deadline day, even late at night', () => {
    expect(isOverdue('2026-10-22T00:00:00', 'ToDo', oct21Noon)).toBe(false)
    expect(isOverdue('2026-10-21T00:00:00', 'ToDo', oct21Noon)).toBe(false)
    expect(isOverdue('2026-10-21T00:00:00', 'InProgress', oct21LateNight)).toBe(false)
  })

  it('is overdue from the day after the deadline', () => {
    expect(isOverdue('2026-10-20T00:00:00', 'ToDo', oct21Noon)).toBe(true)
    expect(isOverdue('2026-10-20', 'InProgress', oct21Noon)).toBe(true)
  })

  it('is never overdue when finished, or without a usable deadline', () => {
    expect(isOverdue('2000-01-01T00:00:00', 'Done', oct21Noon)).toBe(false)
    expect(isOverdue(null, 'ToDo', oct21Noon)).toBe(false)
    expect(isOverdue('soon', 'ToDo', oct21Noon)).toBe(false)
  })
})

const task = (id: string, status: ResearchTask['status']): ResearchTask => ({
  id,
  projectId: 'p1',
  paperId: null,
  title: id,
  description: '',
  status,
  priority: 'Medium',
  deadline: null,
  assignedToUserId: null,
  assignedToName: null,
  createdByUserId: 'u1',
  createdByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  completedAt: null,
})

describe('groupByStatus', () => {
  it('splits tasks by status and keeps their order within each group', () => {
    const groups = groupByStatus([
      task('a', 'Done'),
      task('b', 'ToDo'),
      task('c', 'InProgress'),
      task('d', 'ToDo'),
    ])

    expect(groups.ToDo.map((t) => t.id)).toEqual(['b', 'd'])
    expect(groups.InProgress.map((t) => t.id)).toEqual(['c'])
    expect(groups.Done.map((t) => t.id)).toEqual(['a'])
  })
})

describe('canChangeStatus', () => {
  const assigned: ResearchTask = { ...task('a', 'ToDo'), assignedToUserId: 'u2' }
  const unassigned = task('b', 'ToDo')

  it('lets an owner change any task, assigned or not', () => {
    expect(canChangeStatus(assigned, 'u1', true)).toBe(true)
    expect(canChangeStatus(unassigned, 'u1', true)).toBe(true)
  })

  it('lets the assignee change their own task', () => {
    expect(canChangeStatus(assigned, 'u2', false)).toBe(true)
  })

  it('does not let anyone else change a task, and only an owner can change an unassigned one', () => {
    expect(canChangeStatus(assigned, 'u3', false)).toBe(false)
    expect(canChangeStatus(unassigned, 'u2', false)).toBe(false)
    expect(canChangeStatus(assigned, undefined, false)).toBe(false)
  })
})

describe('canManageTask', () => {
  const madeByAna: ResearchTask = { ...task('a', 'ToDo'), createdByUserId: 'u1', assignedToUserId: 'u2' }

  it('lets an owner manage any task', () => {
    expect(canManageTask(madeByAna, 'u9', true)).toBe(true)
  })

  it('lets the creator manage their own task', () => {
    expect(canManageTask(madeByAna, 'u1', false)).toBe(true)
  })

  it('does not let anyone else manage a task, not even its assignee', () => {
    expect(canManageTask(madeByAna, 'u2', false)).toBe(false)
    expect(canManageTask(madeByAna, 'u3', false)).toBe(false)
    expect(canManageTask(madeByAna, undefined, false)).toBe(false)
  })
})