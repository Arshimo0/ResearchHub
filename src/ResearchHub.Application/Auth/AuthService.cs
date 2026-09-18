using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Auth
{
    public class AuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ITokenService _tokenService;

        public AuthService(IUserRepository userRepository, IPasswordHasher passwordHasher, IUnitOfWork unitOfWork, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _unitOfWork = unitOfWork;
            _tokenService = tokenService;
        }

        public async Task<AuthResult> RegisterAsync(RegisterRequest request)
        {
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser is not null)
                throw new InvalidOperationException("A user with this email already exists.");            

            var passwordHash = _passwordHasher.Hash(request.Password);
            var user = new User(request.Email, request.DisplayName, passwordHash);

            await _userRepository.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();
            return IssueTokens(user);
        }
        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password.");

            return IssueTokens(user);
        }

        private AuthResult IssueTokens(User user)
        {
            var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            return new AuthResult(accessToken, refreshToken, expiresAt);
        }
    }
}