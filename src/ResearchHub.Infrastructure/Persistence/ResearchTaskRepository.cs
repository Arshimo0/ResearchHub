using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class ResearchTaskRepository : IResearchTaskRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public ResearchTaskRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<ResearchTask?> GetByIdAsync(Guid id) =>
            _dbContext.ResearchTasks.SingleOrDefaultAsync(t => t.Id == id);

        public async Task<IReadOnlyList<ResearchTask>> GetByProjectIdAsync(Guid projectId) =>
            await _dbContext.ResearchTasks
                .Where(t => t.ProjectId == projectId)
                .OrderBy(t => t.CreatedAt)
                .ToListAsync();

        public Task AddAsync(ResearchTask task)
        {
            _dbContext.ResearchTasks.Add(task);
            return Task.CompletedTask;
        }

        public void Remove(ResearchTask task)
        {
            _dbContext.ResearchTasks.Remove(task);
        }
    }
}