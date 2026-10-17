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

    public UserServiceTests()
    {
        _sut = new UserService(_userRepository.Object);
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
}