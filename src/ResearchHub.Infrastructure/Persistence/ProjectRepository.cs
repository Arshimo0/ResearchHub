using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly ResearchHubDbContext _dbContext;
        public ProjectRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        
        }
        public Task<ResearchProject?> GetByIdAsync(Guid id) =>
            _dbContext.ResearchProjects
                .Include(p => p.Members)
                .SingleOrDefaultAsync(p => p.Id == id);
        public Task AddAsync(ResearchProject project)
        {
            _dbContext.ResearchProjects.Add(project);
            return Task.CompletedTask;
        }
        public void Remove(ResearchProject project)
        {
            _dbContext.ResearchProjects.Remove(project);
        }
        public async Task<IReadOnlyList<ResearchProject>> GetByMemberUserIdAsync(Guid userId) =>
        await _dbContext.ResearchProjects
            .Include(p => p.Members)
            .Where(p => p.Members.Any(m => m.UserId == userId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }
}