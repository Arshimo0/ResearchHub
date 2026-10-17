using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using FluentValidation;
namespace ResearchHub.Application.Users;

public class UserService
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<UpdateProfileRequest> _updateProfileValidator;

    public UserService(
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        IValidator<UpdateProfileRequest> updateProfileValidator)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _updateProfileValidator = updateProfileValidator;
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

    public async Task<UserDto> GetProfileAsync(Guid currentUserId)
    {
        var user = await GetCurrentUserOrThrow(currentUserId);
        return UserDto.FromEntity(user);
    }

    public async Task<UserDto> UpdateProfileAsync(Guid currentUserId, UpdateProfileRequest request)
    {
        await _updateProfileValidator.ValidateOrThrowAsync(request);

        var user = await GetCurrentUserOrThrow(currentUserId);

        user.UpdateProfile(request.DisplayName);
        await _unitOfWork.SaveChangesAsync();

        return UserDto.FromEntity(user);
    }

    private async Task<Domain.Entities.User> GetCurrentUserOrThrow(Guid userId) =>
        await _userRepository.GetByIdAsync(userId)
            ?? throw new UnauthorizedAccessException("The current user no longer exists.");
}