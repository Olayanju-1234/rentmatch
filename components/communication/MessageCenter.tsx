import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, Calendar, Send, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { communicationApi } from '@/src/lib/communicationApi';
import { convertBackendToFrontend } from '@/src/utils/typeConversion';
import type { IMessage, IViewing, PopulatedMessage, PopulatedViewing, IUser, IProperty } from '@/src/types';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  email?: string;
}

interface MessageCenterProps {
  userId: string;
  userType: 'tenant' | 'landlord';
  /** Pre-populated contacts (e.g. landlords from viewings) shown in the To dropdown */
  contacts?: Contact[];
}

export const MessageCenter: React.FC<MessageCenterProps> = ({
  userId,
  userType,
  contacts = [],
}) => {
  const [messages, setMessages] = useState<PopulatedMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<PopulatedMessage[]>([]);
  const [viewings, setViewings] = useState<PopulatedViewing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState<PopulatedMessage | null>(null);
  const [selectedViewing, setSelectedViewing] = useState<PopulatedViewing | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showViewingDialog, setShowViewingDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({
    toUserId: '',
    subject: '',
    message: '',
    messageType: 'general' as const,
  });
  const [newViewing, setNewViewing] = useState({
    propertyId: '',
    requestedDate: '',
    requestedTime: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [userId, activeTab]);

  useEffect(() => {
    if (userType === 'landlord') {
      setLoading(true);
      setError(null);
      communicationApi.getViewings(undefined, undefined, undefined, 'landlord')
        .then((response) => {
          if (response.success) {
            setViewings((response.data ?? []).map((v: any) => convertBackendToFrontend.viewing(v)));
          } else {
            setViewings([]);
          }
        })
        .catch((err) => {
          setError('Failed to fetch viewing requests.');
          setViewings([]);
        })
        .finally(() => setLoading(false));
    }
  }, [userType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'inbox') {
        const response = await communicationApi.getInbox();
        if (response.success) {
          const convertedMessages = response.data?.map((msg: any) => convertBackendToFrontend.message(msg)) || [];
          setMessages(convertedMessages);
        }
      } else if (activeTab === 'sent') {
        const response = await communicationApi.getSentMessages();
        if (response.success) {
          const convertedMessages = response.data?.map((msg: any) => convertBackendToFrontend.message(msg)) || [];
          setSentMessages(convertedMessages);
        }
      } else if (activeTab === 'viewings') {
        const response = await communicationApi.getViewings(undefined, undefined, undefined, userType);
        if (response.success) {
          const convertedViewings = response.data?.map((viewing: any) => convertBackendToFrontend.viewing(viewing)) || [];
          setViewings(convertedViewings);
        }
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.toUserId || !newMessage.subject || !newMessage.message) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await communicationApi.sendMessage(newMessage);
      if (response.success) {
        setShowSendDialog(false);
        setNewMessage({ toUserId: '', subject: '', message: '', messageType: 'general' });
        loadData();
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestViewing = async () => {
    if (!newViewing.propertyId || !newViewing.requestedDate || !newViewing.requestedTime) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await communicationApi.requestViewing(newViewing);
      if (response.success) {
        setShowViewingDialog(false);
        setNewViewing({ propertyId: '', requestedDate: '', requestedTime: '', notes: '' });
        loadData();
      }
    } catch (err) {
      setError('Failed to request viewing. Please try again.');
      console.error('Error requesting viewing:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateViewingStatus = async (viewingId: string, status: string, notes?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await communicationApi.updateViewingStatus(viewingId, status as any, notes);
      if (response.success) {
        loadData();
      }
    } catch (err) {
      setError('Failed to update viewing status. Please try again.');
      console.error('Error updating viewing status:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await communicationApi.markAsRead(messageId);
      loadData();
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'Unknown User';
    if (typeof user === 'string') {
      return user.length > 6 ? `User (${user.slice(0, 6)}...)` : 'Unknown User';
    }
    if (typeof user === 'object') {
      if (user.name) return user.name;
      if (user.email) return user.email;
      if (user._id) return `User (${String(user._id).slice(0, 6)}...)`;
      if (user._doc) {
        if (user._doc.name) return user._doc.name;
        if (user._doc.email) return user._doc.email;
        if (user._doc._id) return `User (${String(user._doc._id).slice(0, 6)}...)`;
      }
      return 'Unknown User';
    }
    return 'Unknown User';
  };

  const getUserEmail = (user: any) => {
    if (!user) return '';
    if (typeof user === 'object') {
      if (user.email) return user.email;
      if (user._doc && user._doc.email) return user._doc.email;
    }
    return '';
  };

  const getPropertyDisplayName = (property: any) => {
    if (!property) return 'Unknown Property';
    if (typeof property === 'string') {
      return property.length > 6 ? `Property (${property.slice(0, 6)}...)` : 'Unknown Property';
    }
    if (typeof property === 'object') {
      if (property.title) return property.title;
      if (property._id) return `Property (${String(property._id).slice(0, 6)}...)`;
      return 'Unknown Property';
    }
    return 'Unknown Property';
  };

  const getPropertyLocation = (property: any) => {
    if (!property || typeof property !== 'object') return '';
    if (property.location) {
      return `${property.location.address || ''}${property.location.city ? ', ' + property.location.city : ''}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication Center
          </CardTitle>
          <CardDescription>
            Manage messages and property viewing requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inbox">
                Inbox ({messages.filter(m => m.status === 'sent').length})
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="viewings">
                Viewings ({viewings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inbox</h3>
                <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send New Message</DialogTitle>
                      <DialogDescription>
                        Send a message to another user
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="toUserId">To</Label>
                        {contacts.length > 0 ? (
                          <Select
                            value={newMessage.toUserId}
                            onValueChange={(value) => setNewMessage({ ...newMessage, toUserId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select recipient" />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}{c.email ? ` (${c.email})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="toUserId"
                            value={newMessage.toUserId}
                            onChange={(e) => setNewMessage({ ...newMessage, toUserId: e.target.value })}
                            placeholder="Enter user ID"
                          />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={newMessage.subject}
                          onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                          placeholder="Enter subject"
                        />
                      </div>
                      <div>
                        <Label htmlFor="messageType">Message Type</Label>
                        <Select
                          value={newMessage.messageType}
                          onValueChange={(value) => setNewMessage({ ...newMessage, messageType: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="inquiry">Property Inquiry</SelectItem>
                            <SelectItem value="viewing_request">Viewing Request</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={newMessage.message}
                          onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                          placeholder="Enter your message"
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={sendMessage} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Send Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <span className="text-red-500 mb-2">{error}</span>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : messages.length === 0 ? (
                <Alert>
                  <AlertDescription>No messages in your inbox.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <Card 
                      key={message._id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        message.status === 'sent' ? 'border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (message.status === 'sent') {
                          markAsRead(message._id);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{message.messageType}</Badge>
                              <Badge className={message.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                                {message.status}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{message.subject}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              From: {getUserDisplayName(message.fromUserId)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {message.message.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              <h3 className="text-lg font-semibold">Sent Messages</h3>
              
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : sentMessages.length === 0 ? (
                <Alert>
                  <AlertDescription>No sent messages.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <Card key={message._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{message.messageType}</Badge>
                              <Badge className="bg-gray-100 text-gray-800">
                                {message.status}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{message.subject}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              To: {getUserDisplayName(message.toUserId)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {message.message.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="viewings" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Property Viewings</h3>
                {userType === 'tenant' && (
                  <Dialog open={showViewingDialog} onOpenChange={setShowViewingDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Request Viewing
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Property Viewing</DialogTitle>
                        <DialogDescription>
                          Schedule a viewing for a property
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="propertyId">Property ID</Label>
                          <Input
                            id="propertyId"
                            value={newViewing.propertyId}
                            onChange={(e) => setNewViewing({ ...newViewing, propertyId: e.target.value })}
                            placeholder="Enter property ID"
                          />
                        </div>
                        <div>
                          <Label htmlFor="requestedDate">Requested Date</Label>
                          <Input
                            id="requestedDate"
                            type="date"
                            value={newViewing.requestedDate}
                            onChange={(e) => setNewViewing({ ...newViewing, requestedDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="requestedTime">Requested Time</Label>
                          <Input
                            id="requestedTime"
                            value={newViewing.requestedTime}
                            onChange={(e) => setNewViewing({ ...newViewing, requestedTime: e.target.value })}
                            placeholder="e.g., 2:00 PM"
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={newViewing.notes}
                            onChange={(e) => setNewViewing({ ...newViewing, notes: e.target.value })}
                            placeholder="Any additional notes"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewingDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={requestViewing} disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Request Viewing
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : viewings.length === 0 ? (
                <Alert>
                  <AlertDescription>No viewing requests found.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {viewings.map((viewing) => (
                    <Card key={viewing._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(viewing.status)}
                              <Badge className={getStatusColor(viewing.status)}>
                                {viewing.status}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">
                              Property: <span className="font-semibold">{getPropertyDisplayName(viewing.propertyId)}</span>
                              {getPropertyLocation(viewing.propertyId) && (
                                <span className="block text-xs text-gray-500">{getPropertyLocation(viewing.propertyId)}</span>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Tenant: <span className="font-semibold">{getUserDisplayName(viewing.tenantId)}</span>
                              {getUserEmail(viewing.tenantId) && (
                                <span className="block text-xs text-gray-500">{getUserEmail(viewing.tenantId)}</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Date: {formatDate(viewing.requestedDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Time: {viewing.requestedTime}
                            </p>
                            {viewing.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Notes: {viewing.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(viewing.createdAt)}
                            </p>
                          </div>
                          {userType === 'landlord' && viewing.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateViewingStatus(viewing._id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateViewingStatus(viewing._id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-lg w-full p-6 rounded-2xl shadow-xl bg-white max-h-[60vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-1">{selectedMessage.subject}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mb-4">{formatDate(selectedMessage.createdAt)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-xs text-gray-500">From</Label>
                <div className="flex items-center gap-2 text-base font-semibold text-gray-800 mt-1">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>{getUserDisplayName(selectedMessage.fromUserId)}</span>
                </div>
                {getUserEmail(selectedMessage.fromUserId) && (
                  <span className="block text-xs text-gray-500 ml-6">{getUserEmail(selectedMessage.fromUserId)}</span>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-500">Message</Label>
                <div className="text-base whitespace-pre-wrap break-words break-all max-w-full bg-gray-50 rounded-md p-4 mt-1 overflow-x-auto" style={{wordBreak: 'break-word'}}>
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 