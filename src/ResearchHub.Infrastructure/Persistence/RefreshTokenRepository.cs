using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public RefreshTokenRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<RefreshToken?> GetByTokenAsync(string token) =>
            _dbContext.RefreshTokens.SingleOrDefaultAsync(r => r.Token == token);

        public Task AddAsync(RefreshToken refreshToken)
        {
            _dbContext.RefreshTokens.Add(refreshToken);
            return Task.CompletedTask;
    }
    }
}