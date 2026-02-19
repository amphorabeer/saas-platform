import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/waiters/assignments — active assignments with employee + table */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const assignments = await prisma.waiterAssignment.findMany({
      where: { restaurantId: session.restaurantId, isActive: true },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        table: {
          select: {
            id: true,
            number: true,
            zone: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(
      assignments.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        tableId: a.tableId,
        assignedAt: a.assignedAt.toISOString(),
        employee: a.employee
          ? {
              id: a.employee.id,
              name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
              role: a.employee.role,
            }
          : null,
        table: a.table
          ? {
              id: a.table.id,
              number: a.table.number,
              zone: a.table.zone,
            }
          : null,
      }))
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/waiters/assignments — assign employee to table. Body: { employeeId, tableId } */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { employeeId, tableId } = body;

    if (!employeeId || !tableId) {
      return NextResponse.json(
        { error: 'employeeId და tableId აუცილებელია' },
        { status: 400 }
      );
    }

    const [employee, table] = await Promise.all([
      prisma.restaurantEmployee.findFirst({
        where: { id: employeeId, restaurantId: session.restaurantId },
      }),
      prisma.restaurantTable.findFirst({
        where: { id: tableId, restaurantId: session.restaurantId },
      }),
    ]);
    if (!employee) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }
    if (!table) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }

    const existing = await prisma.waiterAssignment.findFirst({
      where: { tableId, isActive: true },
    });
    if (existing) {
      await prisma.waiterAssignment.update({
        where: { id: existing.id },
        data: { isActive: false, unassignedAt: new Date() },
      });
    }

    const assignment = await prisma.waiterAssignment.create({
      data: {
        restaurantId: session.restaurantId,
        employeeId,
        tableId,
        isActive: true,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      id: assignment.id,
      employeeId: assignment.employeeId,
      tableId: assignment.tableId,
      assignedAt: assignment.assignedAt.toISOString(),
      employee: {
        id: assignment.employee.id,
        name: `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
      },
      table: {
        id: assignment.table.id,
        number: assignment.table.number,
        zoneName: assignment.table.zone?.name,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
