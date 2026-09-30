using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.Projects
{
    public record ProjectDto(
        Guid Id,
        string Name,
        string Description,
        ProjectStatus Status,
        DateTime CreatedAt,
        IReadOnlyCollection<ProjectMemberDto> Members);

    public record ProjectMemberDto(Guid UserId, ProjectRole Role, DateTime JoinedAt);
}