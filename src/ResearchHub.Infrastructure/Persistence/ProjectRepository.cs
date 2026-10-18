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
        public async Task RemoveWithContentsAsync(ResearchProject project)
        {
            var tasks = await _dbContext.ResearchTasks.Where(t => t.ProjectId == project.Id).ToListAsync();
            var papers = await _dbContext.ResearchPapers.Where(p => p.ProjectId == project.Id).ToListAsync();
            var tags = await _dbContext.Tags.Where(t => t.ProjectId == project.Id).ToListAsync();

            _dbContext.ResearchTasks.RemoveRange(tasks);
            _dbContext.ResearchPapers.RemoveRange(papers);
            _dbContext.Tags.RemoveRange(tags);
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