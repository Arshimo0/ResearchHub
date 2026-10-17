using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Common
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByIdAsync(Guid id);
        Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
        Task AddAsync(User user);
    }
}