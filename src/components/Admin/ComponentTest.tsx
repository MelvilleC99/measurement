import React, { useState } from 'react';
import { Button } from '../../styles/shadcn';
import { Input } from '../../styles/shadcn';
import { Progress } from '../../styles/shadcn/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../styles/shadcn/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../styles/shadcn/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../styles/shadcn/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../styles/shadcn/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../styles/shadcn/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../styles/shadcn';
import { Textarea } from '../../styles/shadcn/ui/textarea';

const ComponentTest = () => {
    const [progress, setProgress] = useState(60);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Sample data for table
    const tableData = [
        { id: 1, name: "Item 1", status: "Active", value: 100 },
        { id: 2, name: "Item 2", status: "Pending", value: 150 },
        { id: 3, name: "Item 3", status: "Completed", value: 200 },
    ];

    return (
        <div className="p-8 space-y-12">
            <div className="border-b pb-4">
                <h1 className="text-3xl font-bold">Component Library</h1>
                <p className="text-gray-500 mt-2">Interactive preview of shadcn/ui components</p>
            </div>

            {/* Tabs for better organization */}
            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Inputs</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="data">Data Display</TabsTrigger>
                </TabsList>

                {/* Basic Inputs Tab */}
                <TabsContent value="basic" className="space-y-8">
                    {/* Buttons Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Buttons</CardTitle>
                            <CardDescription>Available button variants</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <Button variant="default">Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                        </CardContent>
                    </Card>

                    {/* Form Inputs Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Form Inputs</CardTitle>
                            <CardDescription>Various input types and controls</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Text Input</label>
                                <Input placeholder="Enter text..." />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select</label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Option 1</SelectItem>
                                        <SelectItem value="2">Option 2</SelectItem>
                                        <SelectItem value="3">Option 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Textarea</label>
                                <Textarea placeholder="Enter long form content..." />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Feedback Tab */}
                <TabsContent value="feedback" className="space-y-8">
                    {/* Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress</CardTitle>
                            <CardDescription>Show progress indicators</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Progress value={progress} className="w-full" />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setProgress(p => Math.max(0, p - 10))}
                                >
                                    Decrease
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setProgress(p => Math.min(100, p + 10))}
                                >
                                    Increase
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Alerts</CardTitle>
                            <CardDescription>Status and notification messages</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertTitle>Info Alert</AlertTitle>
                                <AlertDescription>
                                    This is a default information alert message.
                                </AlertDescription>
                            </Alert>

                            <Alert variant="destructive">
                                <AlertTitle>Error Alert</AlertTitle>
                                <AlertDescription>
                                    This is a destructive error alert message.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-8">
                    {/* Dialog */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dialog</CardTitle>
                            <CardDescription>Modal dialogs and popups</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>Open Dialog</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Example Dialog</DialogTitle>
                                        <DialogDescription>
                                            This is an example dialog window with content.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <p>Dialog content goes here...</p>
                                    </div>
                                    <Button onClick={() => setDialogOpen(false)}>Close</Button>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    {/* Cards */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cards</CardTitle>
                            <CardDescription>Content containers and layouts</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Nested Card</CardTitle>
                                    <CardDescription>A card within a card</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    This is an example of nested card content.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Another Card</CardTitle>
                                    <CardDescription>More card examples</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    Cards can be used to organize various types of content.
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Data Display Tab */}
                <TabsContent value="data" className="space-y-8">
                    {/* Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Table</CardTitle>
                            <CardDescription>Data tables and lists</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.id}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.status}</TableCell>
                                            <TableCell className="text-right">{row.value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ComponentTest;