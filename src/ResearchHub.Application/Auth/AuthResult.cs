using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Users;

namespace ResearchHub.Application.Auth;

public record AuthResult(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresAt, UserDto User);