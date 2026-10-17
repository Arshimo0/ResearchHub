using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchHub.Application.Users;
namespace ResearchHub.API.Controllers;

[Authorize]
[Route("api/users")]
public class UsersController : ApiControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet("lookup")]
    public async Task<ActionResult<UserLookupDto>> Lookup([FromQuery] string email)
    {
        var result = await _userService.LookupByEmailAsync(email);
        return Ok(result);
    }
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var result = await _userService.GetProfileAsync(CurrentUserId);
        return Ok(result);
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMe(UpdateProfileRequest request)
    {
        var result = await _userService.UpdateProfileAsync(CurrentUserId, request);
        return Ok(result);
    }
}