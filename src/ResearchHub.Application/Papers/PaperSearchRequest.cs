using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Papers;
public record PaperSearchRequest(string Query, Guid? ProjectId);