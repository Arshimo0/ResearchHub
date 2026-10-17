using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.Projects;

public record ProjectSummaryDto(
    Guid Id,
    string Name,
    string Description,
    ProjectStatus Status,
    DateTime CreatedAt,
    int MemberCount,
    ProjectRole MyRole);