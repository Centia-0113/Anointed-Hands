using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private static readonly HashSet<string> ValidStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Received", "Preparing", "Ready", "Completed", "Cancelled" };

    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    /// <summary>All orders (admin only).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetAllOrders()
    {
        return Ok(await _orderService.GetAllOrdersAsync());
    }

    /// <summary>The signed-in customer's own orders.</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<OrderDto>>> GetMyOrders()
    {
        return Ok(await _orderService.GetOrdersForUserAsync(User.UserId()!.Value));
    }

    /// <summary>A single order: admins see any, customers only their own.</summary>
    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        if (!User.IsInRole(Roles.Admin) && await _orderService.GetOwnerIdAsync(id) != User.UserId())
            return NotFound();

        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null)
            return NotFound();

        return Ok(order);
    }

    /// <summary>Place an order. Open to guests; linked to the account when signed in.</summary>
    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] CreateOrderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest(new { message = "Please enter your name." });

        OrderDto order;
        try
        {
            order = await _orderService.CreateOrderAsync(dto, User.UserId());
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("search")]
    public async Task<ActionResult<List<OrderDto>>> SearchOrders(
        [FromQuery] string? customerName,
        [FromQuery] string? paymentReference)
    {
        var orders = await _orderService.SearchOrdersAsync(customerName ?? "", paymentReference ?? "");
        return Ok(orders);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        if (!ValidStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Unknown order status." });

        var result = await _orderService.UpdateOrderStatusAsync(id, dto.Status);
        return result ? NoContent() : NotFound();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkOrderAsPaid(int id, [FromBody] MarkPaidDto dto)
    {
        var result = await _orderService.MarkOrderAsPaidAsync(id, dto.PaymentReference ?? "");
        return result ? NoContent() : NotFound();
    }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = string.Empty;
}
