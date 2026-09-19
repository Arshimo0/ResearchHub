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
        private const int RefreshTokenExpiryDays = 7;

        private readonly IUserRepository _userRepository;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;

        public AuthService(
            IUserRepository userRepository,
            IRefreshTokenRepository refreshTokenRepository,
            IUnitOfWork unitOfWork,
            IPasswordHasher passwordHasher,
            ITokenService tokenService)
        {
            _userRepository = userRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
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

            return await IssueTokensAsync(user);
        }

        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password.");

            return await IssueTokensAsync(user);
        }

        public async Task<AuthResult> RefreshAsync(string refreshToken)
        {
            var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
            if (storedToken is null || !storedToken.IsActive)
                throw new UnauthorizedAccessException("Invalid or expired refresh token.");

            var user = await _userRepository.GetByIdAsync(storedToken.UserId)
                ?? throw new UnauthorizedAccessException("Invalid or expired refresh token.");

            storedToken.Revoke();

            return await IssueTokensAsync(user);
        }

        private async Task<AuthResult> IssueTokensAsync(User user)
        {
            var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
            var refreshTokenValue = _tokenService.GenerateRefreshToken();

            var refreshToken = new RefreshToken(user.Id, refreshTokenValue, DateTime.UtcNow.AddDays(RefreshTokenExpiryDays));
            await _refreshTokenRepository.AddAsync(refreshToken);
            await _unitOfWork.SaveChangesAsync();

            return new AuthResult(accessToken, refreshTokenValue, expiresAt);
        }
    }
}