"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@saas-platform/ui";

const rooms = [
  { number: "101", type: "Single", status: "vacant", floor: 1 },
  { number: "102", type: "Double", status: "occupied", floor: 1 },
  { number: "103", type: "Suite", status: "cleaning", floor: 1 },
  { number: "201", type: "Single", status: "vacant", floor: 2 },
  { number: "202", type: "Double", status: "occupied", floor: 2 },
  { number: "203", type: "Double", status: "vacant", floor: 2 },
  { number: "301", type: "Suite", status: "occupied", floor: 3 },
  { number: "302", type: "Single", status: "maintenance", floor: 3 },
];

const todaysArrivals = [
  { room: "101", guest: "გიორგი ბერიძე", checkIn: "14:00", status: "confirmed" },
  { room: "201", guest: "ანა მელაძე", checkIn: "15:00", status: "confirmed" },
  { room: "203", guest: "დავით კვარაცხელია", checkIn: "16:00", status: "pending" },
];

const todaysDepartures = [
  { room: "102", guest: "მარიამ ჩხაიძე", checkOut: "11:00", status: "checked-out" },
  { room: "202", guest: "ნიკა ლომიძე", checkOut: "12:00", status: "pending" },
  { room: "301", guest: "თამარ ბეგიაშვილი", checkOut: "13:00", status: "pending" },
];

const housekeepingStatus = [
  { room: "103", status: "cleaning", assignedTo: "ნინო", estimatedTime: "30 წუთი" },
  { room: "302", status: "maintenance", assignedTo: "გიორგი", estimatedTime: "2 საათი" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "vacant":
      return "bg-green-100 text-green-800 border-green-200";
    case "occupied":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cleaning":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "maintenance":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "vacant":
      return "თავისუფალი";
    case "occupied":
      return "დაკავებული";
    case "cleaning":
      return "გაწმენდა";
    case "maintenance":
      return "რემონტი";
    default:
      return status;
  }
};

export default function HotelDashboard() {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const filteredRooms = selectedFloor
    ? rooms.filter((room) => room.floor === selectedFloor)
    : rooms;

  const vacantRooms = rooms.filter((r) => r.status === "vacant").length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const cleaningRooms = rooms.filter((r) => r.status === "cleaning").length;
  const occupancyRate = Math.round((occupiedRooms / rooms.length) * 100);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">სასტუმროს დეშბორდი</h1>
            <p className="text-muted-foreground">მოგესალმებით, დღეს არის {new Date().toLocaleDateString("ka-GE")}</p>
          </div>
          <div className="flex gap-3">
            <Button>ახალი რეზერვაცია</Button>
            <Button variant="outline">ჩეკ-ინ</Button>
            <Button variant="outline">ჩეკ-აუთი</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>თავისუფალი ოთახები</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{vacantRooms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>დაკავებული ოთახები</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{occupiedRooms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>გაწმენდაში</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{cleaningRooms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>დაკავებულობის მაჩვენებელი</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{occupancyRate}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Room Status Grid */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ოთახების სტატუსი</CardTitle>
                  <CardDescription>ყველა ოთახის მიმდინარე სტატუსი</CardDescription>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((floor) => (
                    <Button
                      key={floor}
                      variant={selectedFloor === floor ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFloor(selectedFloor === floor ? null : floor)}
                    >
                      {floor} სართული
                    </Button>
                  ))}
                  {selectedFloor && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFloor(null)}>
                      ყველა
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {filteredRooms.map((room) => (
                  <div
                    key={room.number}
                    className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(
                      room.status
                    )}`}
                  >
                    <div className="font-bold text-lg mb-1">{room.number}</div>
                    <div className="text-sm opacity-80 mb-2">{room.type}</div>
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(room.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>სწრაფი მოქმედებები</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" size="lg">
                ➕ ახალი რეზერვაცია
              </Button>
              <Button className="w-full" variant="outline" size="lg">
                🔑 ჩეკ-ინ
              </Button>
              <Button className="w-full" variant="outline" size="lg">
                🚪 ჩეკ-აუთი
              </Button>
              <Button className="w-full" variant="outline" size="lg">
                🧹 გაწმენდის მოთხოვნა
              </Button>
              <Button className="w-full" variant="outline" size="lg">
                🔧 რემონტის მოთხოვნა
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Today's Arrivals */}
          <Card>
            <CardHeader>
              <CardTitle>დღეს ჩამოსვლები</CardTitle>
              <CardDescription>{todaysArrivals.length} რეზერვაცია</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysArrivals.map((arrival, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{arrival.guest}</div>
                      <div className="text-sm text-muted-foreground">ოთახი {arrival.room} • {arrival.checkIn}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={arrival.status === "confirmed" ? "default" : "secondary"}>
                        {arrival.status === "confirmed" ? "დადასტურებული" : "მოლოდინში"}
                      </Badge>
                      <Button size="sm" variant="outline">
                        ჩეკ-ინ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Departures */}
          <Card>
            <CardHeader>
              <CardTitle>დღეს გამგზავრებები</CardTitle>
              <CardDescription>{todaysDepartures.length} რეზერვაცია</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysDepartures.map((departure, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{departure.guest}</div>
                      <div className="text-sm text-muted-foreground">ოთახი {departure.room} • {departure.checkOut}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={departure.status === "checked-out" ? "default" : "secondary"}>
                        {departure.status === "checked-out" ? "გამგზავრებული" : "მოლოდინში"}
                      </Badge>
                      {departure.status !== "checked-out" && (
                        <Button size="sm" variant="outline">
                          ჩეკ-აუთი
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Housekeeping Status */}
        <Card>
          <CardHeader>
            <CardTitle>გაწმენდის სტატუსი</CardTitle>
            <CardDescription>მიმდინარე გაწმენდისა და რემონტის სამუშაოები</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {housekeepingStatus.map((task, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">ოთახი {task.room}</div>
                    <Badge variant={task.status === "cleaning" ? "default" : "destructive"}>
                      {task.status === "cleaning" ? "გაწმენდა" : "რემონტი"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    პასუხისმგებელი: {task.assignedTo}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    სავარაუდო დრო: {task.estimatedTime}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
