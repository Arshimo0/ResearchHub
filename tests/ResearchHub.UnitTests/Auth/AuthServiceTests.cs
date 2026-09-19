using Moq;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.UnitTests.Auth;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IRefreshTokenRepository> _refreshTokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<ITokenService> _tokenService = new();
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(
            _userRepository.Object,
            _refreshTokenRepository.Object,
            _unitOfWork.Object,
            _passwordHasher.Object,
            _tokenService.Object);

        _tokenService
            .Setup(t => t.GenerateAccessToken(It.IsAny<User>()))
            .Returns(("fake-access-token", DateTime.UtcNow.AddMinutes(30)));

        _tokenService
            .Setup(t => t.GenerateRefreshToken())
            .Returns("fake-refresh-token");
    }

    [Fact]
    public async Task RegisterAsync_NewEmail_CreatesUserAndReturnsTokens()
    {
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);
        _passwordHasher.Setup(h => h.Hash(It.IsAny<string>())).Returns("hashed-password");

        var result = await _sut.RegisterAsync(new RegisterRequest("new@example.com", "New User", "Password123!"));

        Assert.Equal("fake-access-token", result.AccessToken);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(), Times.Exactly(2)); // once for user, once for refresh token
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsInvalidOperationException()
    {
        var existingUser = new User("taken@example.com", "Existing", "hash");
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync(existingUser);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterAsync(new RegisterRequest("taken@example.com", "New User", "Password123!")));

        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokens()
    {
        var user = new User("test@example.com", "Test User", "correct-hash");
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("correct-password", "correct-hash")).Returns(true);

        var result = await _sut.LoginAsync(new LoginRequest("test@example.com", "correct-password"));

        Assert.Equal("fake-access-token", result.AccessToken);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
    {
        var user = new User("test@example.com", "Test User", "correct-hash");
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _sut.LoginAsync(new LoginRequest("test@example.com", "wrong-password")));
    }

    [Fact]
    public async Task LoginAsync_NonExistentEmail_ThrowsUnauthorizedAccessException()
    {
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _sut.LoginAsync(new LoginRequest("nobody@example.com", "whatever")));
    }

    [Fact]
    public async Task RefreshAsync_ValidToken_RevokesOldTokenAndReturnsNewTokens()
    {
        var user = new User("test@example.com", "Test User", "hash");
        var storedToken = new RefreshToken(user.Id, "old-refresh-token", DateTime.UtcNow.AddDays(1));

        _refreshTokenRepository.Setup(r => r.GetByTokenAsync("old-refresh-token")).ReturnsAsync(storedToken);
        _userRepository.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

        var result = await _sut.RefreshAsync("old-refresh-token");

        Assert.Equal("fake-access-token", result.AccessToken);
        Assert.False(storedToken.IsActive); // revoked
    }

    [Fact]
    public async Task RefreshAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        var expiredToken = new RefreshToken(Guid.NewGuid(), "expired-token", DateTime.UtcNow.AddDays(-1));
        _refreshTokenRepository.Setup(r => r.GetByTokenAsync("expired-token")).ReturnsAsync(expiredToken);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _sut.RefreshAsync("expired-token"));
    }

    [Fact]
    public async Task RefreshAsync_UnknownToken_ThrowsUnauthorizedAccessException()
    {
        _refreshTokenRepository.Setup(r => r.GetByTokenAsync(It.IsAny<string>())).ReturnsAsync((RefreshToken?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _sut.RefreshAsync("nonexistent-token"));
    }
}