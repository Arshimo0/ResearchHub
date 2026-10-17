using Moq;
using ResearchHub.Application.Common;
using ResearchHub.Application.Users;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Users;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly UserService _sut;
    private readonly Mock<IUnitOfWork> _unitOfWork = new();

    public UserServiceTests()
    {
        _sut = new UserService(
            _userRepository.Object,
            _unitOfWork.Object,
            new UpdateProfileRequestValidator());
    }

    [Fact]
    public async Task LookupByEmailAsync_ExistingUser_ReturnsIdAndDisplayName()
    {
        var user = new User("ana@example.com", "Ana", "hash");
        _userRepository.Setup(r => r.GetByEmailAsync("ana@example.com")).ReturnsAsync(user);

        var result = await _sut.LookupByEmailAsync("ana@example.com");

        Assert.Equal(user.Id, result.Id);
        Assert.Equal("Ana", result.DisplayName);
    }

    [Fact]
    public async Task LookupByEmailAsync_UnknownEmail_ThrowsKeyNotFoundException()
    {
        _userRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.LookupByEmailAsync("nobody@example.com"));
    }

    [Fact]
    public async Task LookupByEmailAsync_BlankEmail_ThrowsValidationException()
    {
        var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
            _sut.LookupByEmailAsync("   "));

        Assert.Contains("email", ex.Errors.Keys);
    }
    [Fact]
    public async Task GetProfileAsync_ExistingUser_ReturnsProfileWithoutSensitiveFields()
    {
        var user = new User("ana@example.com", "Ana", "hash");
        _userRepository.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

        var result = await _sut.GetProfileAsync(user.Id);

        Assert.Equal(user.Id, result.Id);
        Assert.Equal("ana@example.com", result.Email);
        Assert.Equal("Ana", result.DisplayName);
    }

    [Fact]
    public async Task GetProfileAsync_UserNoLongerExists_ThrowsUnauthorizedAccessException()
    {
        _userRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _sut.GetProfileAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task UpdateProfileAsync_ValidName_UpdatesTrimsAndSaves()
    {
        var user = new User("ana@example.com", "Ana", "hash");
        _userRepository.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

        var result = await _sut.UpdateProfileAsync(user.Id, new UpdateProfileRequest("  Ana Maria  "));

        Assert.Equal("Ana Maria", result.DisplayName);
        _unitOfWork.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_BlankName_ThrowsValidationExceptionAndSavesNothing()
    {
        var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
            _sut.UpdateProfileAsync(Guid.NewGuid(), new UpdateProfileRequest("")));

        Assert.Contains("displayName", ex.Errors.Keys);
        _unitOfWork.Verify(u => u.SaveChangesAsync(), Times.Never);
    }
}