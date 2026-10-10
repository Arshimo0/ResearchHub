using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.ResearchTasks;
public record UpdateResearchTaskRequest(
    string Title,
    string Description,
    TaskPriority Priority,
    DateTime? Deadline);