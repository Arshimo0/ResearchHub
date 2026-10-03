using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using ResearchHub.Application.Papers;
namespace ResearchHub.Infrastructure.Persistence
{
    public class PaperRepository : IPaperRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public PaperRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public Task<ResearchPaper?> GetByIdAsync(Guid id) =>
        _dbContext.ResearchPapers
            .Include(p => p.Tags)
            .SingleOrDefaultAsync(p => p.Id == id);
        public async Task<IReadOnlyList<ResearchPaper>> GetByProjectIdAsync(Guid projectId, PaperFilter? filter = null)
        {
            var query = _dbContext.ResearchPapers
                .Include(p => p.Tags)
                .Where(p => p.ProjectId == projectId);

            if (filter is not null)
            {
                if (!string.IsNullOrWhiteSpace(filter.Tag))
                {
                    var normalizedTag = filter.Tag.Trim().ToLowerInvariant();
                    query = query.Where(p => p.Tags.Any(t => t.Name == normalizedTag));
                }

                if (!string.IsNullOrWhiteSpace(filter.Author))
                    query = query.Where(p => p.Authors.Contains(filter.Author));

                if (filter.FromDate.HasValue)
                    query = query.Where(p => p.PublicationDate >= filter.FromDate.Value);

                if (filter.ToDate.HasValue)
                    query = query.Where(p => p.PublicationDate <= filter.ToDate.Value);
            }

            return await query.ToListAsync();
        }
        public Task AddAsync(ResearchPaper paper)
        {
            _dbContext.ResearchPapers.Add(paper);
            return Task.CompletedTask;
        }

        public void Remove(ResearchPaper paper)
        {
            _dbContext.ResearchPapers.Remove(paper);
        }
    }
}