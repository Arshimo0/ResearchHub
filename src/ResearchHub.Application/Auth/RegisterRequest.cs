using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Auth;
 public record RegisterRequest(
    string Email,
    string DisplayName,
    string Password);