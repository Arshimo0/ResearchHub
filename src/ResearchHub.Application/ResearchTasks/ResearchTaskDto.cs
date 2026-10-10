using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.ResearchTasks;
public record ResearchTaskDto(
    Guid Id,
    Guid ProjectId,
    Guid? PaperId,
    string Title,
    string Description,
    ResearchTaskStatus Status,
    TaskPriority Priority,
    DateTime? Deadline,
    Guid? AssignedToUserId,
    Guid CreatedByUserId,
    DateTime CreatedAt,
    DateTime? CompletedAt);