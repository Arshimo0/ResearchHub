using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Auth
{
    public interface ITokenService
    {
        (string Token, DateTime ExpiresAt) GenerateAccessToken(User user);
        string GenerateRefreshToken();
    }
}