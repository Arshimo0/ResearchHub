using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class UserRepository : IUserRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public UserRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<User?> GetByEmailAsync(string email) =>
            _dbContext.Users.SingleOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant());

        public Task<User?> GetByIdAsync(Guid id) =>
            _dbContext.Users.SingleOrDefaultAsync(u => u.Id == id);

        public Task AddAsync(User user)
        {
            _dbContext.Users.Add(user);
            return Task.CompletedTask;
        }
    }
}