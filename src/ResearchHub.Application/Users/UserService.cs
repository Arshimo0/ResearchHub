using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;

namespace ResearchHub.Application.Users
{
    public class UserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UserLookupDto> LookupByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new RequestValidationException(new Dictionary<string, string[]>
                {
                    ["email"] = new[] { "Email is required." }
                });

            var user = await _userRepository.GetByEmailAsync(email)
                ?? throw new KeyNotFoundException("No user found with that email.");

            return new UserLookupDto(user.Id, user.Email, user.DisplayName);
        }
    }
}