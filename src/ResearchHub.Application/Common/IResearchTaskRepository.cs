using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Common
{
    public interface IResearchTaskRepository
    {
        Task<ResearchTask?> GetByIdAsync(Guid id);
        Task<IReadOnlyList<ResearchTask>> GetByProjectIdAsync(Guid projectId);
        Task AddAsync(ResearchTask task);
        void Remove(ResearchTask task);
    }
}