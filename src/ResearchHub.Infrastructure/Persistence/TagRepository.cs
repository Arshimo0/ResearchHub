using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class TagRepository : ITagRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public TagRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public Task<Tag?> GetByProjectIdAndNameAsync(Guid projectId, string name) =>
        _dbContext.Tags.SingleOrDefaultAsync(
            t => t.ProjectId == projectId && t.Name == name.Trim().ToLowerInvariant());

        public Task AddAsync(Tag tag)
        {
            _dbContext.Tags.Add(tag);
            return Task.CompletedTask;
        }
    }
}