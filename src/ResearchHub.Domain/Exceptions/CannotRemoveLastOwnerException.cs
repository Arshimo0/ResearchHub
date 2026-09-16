using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Domain.Exceptions
{
    public class CannotRemoveLastOwnerException : DomainException
    {
        public CannotRemoveLastOwnerException(): base("A project must always have at least one owner.") { }
    }
}