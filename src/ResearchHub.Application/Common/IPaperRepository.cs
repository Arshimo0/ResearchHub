using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Application.Papers;
namespace ResearchHub.Application.Common
{
    public interface IPaperRepository
    {
        Task<ResearchPaper?> GetByIdAsync(Guid id);
        Task<IReadOnlyList<ResearchPaper>> GetByProjectIdAsync(Guid projectId, PaperFilter? filter = null);
        Task AddAsync(ResearchPaper paper);
        void Remove(ResearchPaper paper);
    }
}