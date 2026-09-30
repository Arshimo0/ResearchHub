using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.Projects;

public record AddMemberRequest(Guid UserId, ProjectRole Role);