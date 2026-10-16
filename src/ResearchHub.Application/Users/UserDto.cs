using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.Users;

public record UserDto(Guid Id, string Email, string DisplayName, PlatformRole Role)
{
    public static UserDto FromEntity(User user) =>
        new(user.Id, user.Email, user.DisplayName, user.PlatformRole);
}