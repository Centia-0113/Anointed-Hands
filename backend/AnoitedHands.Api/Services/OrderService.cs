using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public interface IOrderService
{
    Task<OrderDto> CreateOrderAsync(CreateOrderDto dto);
    Task<List<OrderDto>> GetAllOrdersAsync();
    Task<OrderDto?> GetOrderByIdAsync(int id);
    Task<List<OrderDto>> SearchOrdersAsync(string customerName, string paymentReference);
    Task<bool> UpdateOrderStatusAsync(int orderId, string status);
    Task<bool> MarkOrderAsPaidAsync(int orderId, string paymentReference);
}

public class OrderService : IOrderService
{
    private readonly AnoitedHandsDbContext _context;

    public OrderService(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
    {
        var paymentRef = $"AH-{DateTime.UtcNow.Ticks % 100000}";
        var orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}";

        var orderItems = new List<OrderItem>();
        decimal totalAmount = 0;

        foreach (var item in dto.Items)
        {
            var cafeItem = await _context.CafeItems.FindAsync(item.CafeItemId);
            if (cafeItem == null) continue;

            var orderItem = new OrderItem
            {
                CafeItemId = item.CafeItemId,
                Quantity = item.Quantity,
                Price = cafeItem.Price
            };
            orderItems.Add(orderItem);
            totalAmount += cafeItem.Price * item.Quantity;
        }

        var order = new Order
        {
            OrderNumber = orderNumber,
            CustomerName = dto.CustomerName,
            PaymentReference = paymentRef,
            TotalAmount = totalAmount,
            Items = orderItems,
            Status = "Received",
            Notes = dto.Notes
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return await MapToDto(order);
    }

    public async Task<List<OrderDto>> GetAllOrdersAsync()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return await Task.WhenAll(orders.Select(MapToDto)).ContinueWith(t => t.Result.ToList());
    }

    public async Task<OrderDto?> GetOrderByIdAsync(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        return order != null ? await MapToDto(order) : null;
    }

    public async Task<List<OrderDto>> SearchOrdersAsync(string customerName, string paymentReference)
    {
        var query = _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .AsQueryable();

        if (!string.IsNullOrEmpty(customerName))
            query = query.Where(o => o.CustomerName.Contains(customerName));

        if (!string.IsNullOrEmpty(paymentReference))
            query = query.Where(o => o.PaymentReference.Contains(paymentReference));

        var orders = await query.ToListAsync();
        return await Task.WhenAll(orders.Select(MapToDto)).ContinueWith(t => t.Result.ToList());
    }

    public async Task<bool> UpdateOrderStatusAsync(int orderId, string status)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null) return false;

        order.Status = status;
        if (status == "Completed")
            order.CompletedAt = DateTime.UtcNow;

        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkOrderAsPaidAsync(int orderId, string paymentReference)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null) return false;

        order.IsPaid = true;
        order.PaymentReference = paymentReference;

        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<OrderDto> MapToDto(Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = order.CustomerName,
            Status = order.Status,
            PaymentReference = order.PaymentReference,
            IsPaid = order.IsPaid,
            TotalAmount = order.TotalAmount,
            Items = order.Items.Select(oi => new OrderItemDto
            {
                Id = oi.Id,
                CafeItemId = oi.CafeItemId,
                CafeItemName = oi.CafeItem?.Name ?? "",
                Quantity = oi.Quantity,
                Price = oi.Price
            }).ToList()
        };
    }
}
