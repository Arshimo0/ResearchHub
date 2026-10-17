using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Users;
public record UserLookupDto(Guid Id, string Email, string DisplayName);