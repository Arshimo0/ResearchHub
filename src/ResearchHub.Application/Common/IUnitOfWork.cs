using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Common;
public interface IUnitOfWork
{
    Task SaveChangesAsync();
}