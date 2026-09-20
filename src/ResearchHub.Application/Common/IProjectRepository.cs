using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Common
{
    public interface IProjectRepository
    {
        Task<ResearchProject?> GetByIdAsync(Guid id);
        Task AddAsync(ResearchProject project);
        void Remove(ResearchProject project);      
    }
}