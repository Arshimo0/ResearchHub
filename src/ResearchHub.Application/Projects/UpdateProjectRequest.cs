using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Projects;

public record UpdateProjectRequest(string Name, string Description);