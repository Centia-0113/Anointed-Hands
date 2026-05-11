using Microsoft.AspNetCore.Mvc;
using AnoitedHands.Api.Services;
using AnoitedHands.Api.DTOs;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetAllOrders()
    {
        var orders = await _orderService.GetAllOrdersAsync();
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null)
            return NotFound();

        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var order = await _orderService.CreateOrderAsync(dto);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<OrderDto>>> SearchOrders(
        [FromQuery] string? customerName,
        [FromQuery] string? paymentReference)
    {
        var orders = await _orderService.SearchOrdersAsync(
            customerName ?? "",
            paymentReference ?? "");

        return Ok(orders);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var result = await _orderService.UpdateOrderStatusAsync(id, dto.Status);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkOrderAsPaid(int id, [FromBody] MarkPaidDto dto)
    {
        var result = await _orderService.MarkOrderAsPaidAsync(id, dto.PaymentReference);
        if (!result)
            return NotFound();

        return NoContent();
    }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = string.Empty;
}
