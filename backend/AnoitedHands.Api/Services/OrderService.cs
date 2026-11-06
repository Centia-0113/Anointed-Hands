using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public interface IOrderService
{
    Task<OrderDto> CreateOrderAsync(CreateOrderDto dto, int? userId);
    Task<List<OrderDto>> GetOrdersForUserAsync(int userId);
    Task<int?> GetOwnerIdAsync(int orderId);
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

    public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto, int? userId)
    {
        var paymentRef = $"AH-C{Random.Shared.Next(10000, 99999)}";
        var orderNumber = $"ORD-{DateTime.UtcNow:MMdd}-{Random.Shared.Next(100, 999)}";

        var orderItems = new List<OrderItem>();
        decimal totalAmount = 0;

        foreach (var item in dto.Items)
        {
            if (item.Quantity <= 0) continue;
            var cafeItem = await _context.CafeItems.FindAsync(item.CafeItemId);
            if (cafeItem == null || !cafeItem.IsActive || cafeItem.IsOutOfStock) continue;

            var orderItem = new OrderItem
            {
                CafeItemId = item.CafeItemId,
                Quantity = item.Quantity,
                Price = Pricing.Effective(cafeItem.Price, cafeItem.DiscountPercent, cafeItem.DiscountEndsOn),
                CafeItem = cafeItem
            };
            orderItems.Add(orderItem);
            totalAmount += orderItem.Price * item.Quantity;
        }

        if (orderItems.Count == 0)
            throw new ArgumentException("Your order has no available items.");

        var order = new Order
        {
            OrderNumber = orderNumber,
            CustomerName = dto.CustomerName,
            PaymentReference = paymentRef,
            TotalAmount = totalAmount,
            Items = orderItems,
            Status = "Received",
            Notes = dto.Notes,
            UserId = userId
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return MapToDto(order);
    }

    public async Task<List<OrderDto>> GetAllOrdersAsync()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(MapToDto).ToList();
    }

    public async Task<List<OrderDto>> GetOrdersForUserAsync(int userId)
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(MapToDto).ToList();
    }

    public async Task<int?> GetOwnerIdAsync(int orderId) =>
        await _context.Orders.Where(o => o.Id == orderId).Select(o => o.UserId).FirstOrDefaultAsync();

    public async Task<OrderDto?> GetOrderByIdAsync(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.CafeItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        return order != null ? MapToDto(order) : null;
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
        return orders.Select(MapToDto).ToList();
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
        if (!string.IsNullOrWhiteSpace(paymentReference))
            order.PaymentReference = paymentReference.Trim();

        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
        return true;
    }

    private static OrderDto MapToDto(Order order)
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
            Notes = order.Notes,
            CreatedAt = DateTime.SpecifyKind(order.CreatedAt, DateTimeKind.Utc),
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
